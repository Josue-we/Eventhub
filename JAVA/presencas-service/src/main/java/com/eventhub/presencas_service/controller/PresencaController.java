package com.eventhub.presencas_service.controller;

import com.eventhub.presencas_service.model.Presenca;
import com.eventhub.presencas_service.repository.PresencaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/presencas")
@CrossOrigin(origins = "*") // <--- Permitir acesso Web
public class PresencaController {

    @Autowired
    private PresencaRepository presencaRepository;

    @GetMapping
    public List<Presenca> listar() {
        return presencaRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Presenca> buscarPorId(@PathVariable Long id) {
        Optional<Presenca> p = presencaRepository.findById(id);
        return p.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Presenca presenca) {
        // Validação: Usuário já fez check-in neste evento?
        boolean jaExiste = presencaRepository.existsByUsuarioIdAndEventoId(
                presenca.getUsuarioId(), 
                presenca.getEventoId()
        );

        if (jaExiste) {
            return ResponseEntity.badRequest().body("Usuário já realizou check-in neste evento!");
        }

        Presenca nova = presencaRepository.save(presenca);
        return ResponseEntity.ok(nova);
    }
}