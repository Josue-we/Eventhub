package com.eventhub.inscricoes_service.controller;

import com.eventhub.inscricoes_service.model.Inscricao;
import com.eventhub.inscricoes_service.repository.InscricaoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/inscricoes")
public class InscricaoController {

    @Autowired
    private InscricaoRepository inscricaoRepository;

    // 1. Consultar todas as inscrições
    @GetMapping
    public List<Inscricao> listar() {
        return inscricaoRepository.findAll();
    }

    // 2. Consultar por ID
    @GetMapping("/{id}")
    public ResponseEntity<Inscricao> buscarPorId(@PathVariable Long id) {
        Optional<Inscricao> i = inscricaoRepository.findById(id);
        return i.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 3. Criar nova inscrição
    @PostMapping
    public Inscricao criar(@RequestBody Inscricao inscricao) {
        return inscricaoRepository.save(inscricao);
    }

    // 4. Cancelar inscrição
    @DeleteMapping("/{id}")
    public ResponseEntity<String> cancelar(@PathVariable Long id) {
        Optional<Inscricao> opt = inscricaoRepository.findById(id);

        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Inscricao inscricao = opt.get();
        inscricao.setStatus("CANCELADA");
        inscricaoRepository.save(inscricao);

        return ResponseEntity.ok("Inscrição cancelada com sucesso.");
    }
}
