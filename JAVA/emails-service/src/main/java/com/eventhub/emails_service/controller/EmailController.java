package com.eventhub.emails_service.controller;

import com.eventhub.emails_service.dto.EmailRequest;
import com.eventhub.emails_service.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/emails")
@CrossOrigin(origins = "*") // <--- Permitir acesso Web
public class EmailController {

    @Autowired
    private EmailService emailService;

    @PostMapping
    public ResponseEntity<String> enviar(@RequestBody EmailRequest request) {
        try {
            emailService.enviarEmail(request);
            return ResponseEntity.ok("E-mail enviado com sucesso!");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erro ao enviar e-mail: " + e.getMessage());
        }
    }
}