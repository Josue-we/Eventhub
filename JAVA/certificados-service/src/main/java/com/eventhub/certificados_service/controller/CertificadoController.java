package com.eventhub.certificados_service.controller;

import com.eventhub.certificados_service.model.Certificado;
import com.eventhub.certificados_service.repository.CertificadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/certificados")
public class CertificadoController {

    @Autowired
    private CertificadoRepository certificadoRepository;

    // 1. Consultar certificado por ID
    @GetMapping("/{id}")
    public ResponseEntity<Certificado> buscarPorId(@PathVariable Long id) {
        return certificadoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 2. Emitir novo certificado
    @PostMapping
    public Certificado emitir(@RequestBody Certificado certificado) {
        certificado.setCodigoAutenticacao(UUID.randomUUID().toString());
        certificado.setDataEmissao(java.time.LocalDateTime.now());
        return certificadoRepository.save(certificado);
    }

    // 3. Validar certificado
    @GetMapping("/validar/{codigo}")
    public ResponseEntity<?> validar(@PathVariable String codigo) {
        return certificadoRepository.findByCodigoAutenticacao(codigo)
                .map(cert -> ResponseEntity.ok("Certificado válido."))
                .orElse(ResponseEntity.status(404).body("Certificado inválido."));
    }
}
