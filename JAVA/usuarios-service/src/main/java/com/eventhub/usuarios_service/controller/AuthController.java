package com.eventhub.usuarios_service.controller;

import com.eventhub.usuarios_service.dto.LoginRequest;
import com.eventhub.usuarios_service.dto.LoginResponse;
import com.eventhub.usuarios_service.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

@PostMapping
public ResponseEntity<?> autenticar(@RequestBody LoginRequest request) {
    try {
        String token = authService.autenticar(request);
        LoginResponse response = new LoginResponse(token);
        return ResponseEntity.ok(response);
    } catch (Exception e) {
        return ResponseEntity.status(401).body("Credenciais inválidas: " + e.getMessage());
    }
}
}
