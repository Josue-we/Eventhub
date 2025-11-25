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

    @GetMapping
    public List<Inscricao> listar() {
        return inscricaoRepository.findAll();
    }

    // Busca as inscrições de um usuário específico (útil para "Minhas Inscrições")
    @GetMapping("/usuario/{usuarioId}")
    public List<Inscricao> listarPorUsuario(@PathVariable Long usuarioId) {
        return inscricaoRepository.findByUsuarioId(usuarioId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Inscricao> buscarPorId(@PathVariable Long id) {
        Optional<Inscricao> i = inscricaoRepository.findById(id);
        return i.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody Inscricao inscricao) {
        // verifica se já existe inscrição ATIVA
        Optional<Inscricao> existente = inscricaoRepository.findByUsuarioIdAndEventoId(
                inscricao.getUsuarioId(), 
                inscricao.getEventoId()
        );

        if (existente.isPresent() && "ATIVA".equals(existente.get().getStatus())) {
            return ResponseEntity.badRequest().body("Usuário já inscrito neste evento!");
        }

        inscricao.setStatus("ATIVA");
        Inscricao nova = inscricaoRepository.save(inscricao);
        return ResponseEntity.ok(nova);
    }

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