FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw --batch-mode -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw --batch-mode -DskipTests package

FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S befocus && adduser -S befocus -G befocus
WORKDIR /app
COPY --from=build /workspace/target/backend-*.jar app.jar

USER befocus
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
