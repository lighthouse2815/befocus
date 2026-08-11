package com.befocus.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

/**
 * Accepts both JDBC URLs and the postgres:// connection strings supplied by
 * common PaaS providers. Explicit DB_* values always win.
 */
public final class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String dbUrl = environment.getProperty("DB_URL");
        String databaseUrl = environment.getProperty("DATABASE_URL");
        String source = StringUtils.hasText(dbUrl) ? dbUrl : databaseUrl;
        if (!StringUtils.hasText(source)) {
            return;
        }

        Map<String, Object> properties = new LinkedHashMap<>();
        if (source.startsWith("jdbc:")) {
            properties.put("spring.datasource.url", source);
        } else if (source.startsWith("postgres://") || source.startsWith("postgresql://")) {
            URI uri = URI.create(source.replaceFirst("^postgres://", "postgresql://"));
            String query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
            int port = uri.getPort() < 0 ? 5432 : uri.getPort();
            properties.put("spring.datasource.url",
                    "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getRawPath() + query);

            if (uri.getRawUserInfo() != null) {
                String[] credentials = uri.getRawUserInfo().split(":", 2);
                properties.putIfAbsent("spring.datasource.username", decode(credentials[0]));
                if (credentials.length == 2) {
                    properties.putIfAbsent("spring.datasource.password", decode(credentials[1]));
                }
            }
        } else {
            throw new IllegalArgumentException("DATABASE_URL must be a JDBC or PostgreSQL URL");
        }

        overrideIfPresent(environment, properties, "DB_USERNAME", "spring.datasource.username");
        overrideIfPresent(environment, properties, "DB_PASSWORD", "spring.datasource.password");
        environment.getPropertySources().addFirst(new MapPropertySource("befocusDatabaseUrl", properties));
    }

    private static void overrideIfPresent(ConfigurableEnvironment environment, Map<String, Object> target,
            String environmentKey, String propertyKey) {
        String value = environment.getProperty(environmentKey);
        if (StringUtils.hasText(value)) {
            target.put(propertyKey, value);
        }
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
