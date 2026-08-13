package com.befocus.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Tên không được để trống") @Size(max = 120, message = "Tên không được vượt quá 120 ký tự") String name,
        @NotBlank(message = "Email không được để trống") @Email(message = "Email không đúng định dạng") @Size(max = 320, message = "Email không được vượt quá 320 ký tự") String email,
        @NotBlank(message = "Mật khẩu không được để trống") @Size(min = 8, max = 128, message = "Mật khẩu phải có từ 8 đến 128 ký tự") String password) {
}
