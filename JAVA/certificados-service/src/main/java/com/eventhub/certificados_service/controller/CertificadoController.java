package com.eventhub.certificados_service.controller;

import com.eventhub.certificados_service.model.Certificado;
import com.eventhub.certificados_service.repository.CertificadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/certificados")
public class CertificadoController {

    @Autowired
    private CertificadoRepository certificadoRepository;

    @GetMapping("/{id}")
    public ResponseEntity<Certificado> buscarPorId(@PathVariable Long id) {
        return certificadoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> emitir(@RequestBody Certificado certificado) {
        // 1. Verifica duplicidade
        boolean jaEmitido = certificadoRepository.existsByUsuarioIdAndEventoId(
                certificado.getUsuarioId(), 
                certificado.getEventoId()
        );

        if (jaEmitido) {
            return ResponseEntity.badRequest().body("Certificado já emitido para este evento!");
        }

        // 2. Gera dados do certificado
        certificado.setCodigoAutenticacao(UUID.randomUUID().toString());
        certificado.setDataEmissao(LocalDateTime.now());
        
        Certificado novo = certificadoRepository.save(certificado);
        return ResponseEntity.ok(novo);
    }

    // Valida se um código UUID é real
    @GetMapping("/validar/{codigo}")
    public ResponseEntity<?> validar(@PathVariable String codigo) {
        Optional<Certificado> cert = certificadoRepository.findByCodigoAutenticacao(codigo);

        if (cert.isPresent()) {
            return ResponseEntity.ok(cert.get()); // Retorna os dados para mostrar na tela
        } else {
            return ResponseEntity.status(404).body("Certificado inválido ou inexistente.");
        }
    }
}