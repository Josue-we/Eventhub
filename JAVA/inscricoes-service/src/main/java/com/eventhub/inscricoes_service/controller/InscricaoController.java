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
@CrossOrigin(origins = "*") // <--- Permitir acesso Web
public class InscricaoController {

    @Autowired
    private InscricaoRepository inscricaoRepository;

    @GetMapping
    public List<Inscricao> listar() {
        return inscricaoRepository.findAll();
    }

    // Busca as inscrições de um usuário específico
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
        try {
            // 1. Busca se existe ALGUMA inscrição (Ativa ou Cancelada)
            Optional<Inscricao> existente = inscricaoRepository.findByUsuarioIdAndEventoId(
                    inscricao.getUsuarioId(), 
                    inscricao.getEventoId()
            );

            if (existente.isPresent()) {
                Inscricao inscricaoBanco = existente.get();
                
                // Cenário A: Já está ativo -> Erro
                if ("ATIVA".equals(inscricaoBanco.getStatus())) {
                    return ResponseEntity.badRequest().body("Usuário já inscrito neste evento!");
                }
                
                // Cenário B: Estava cancelado -> REATIVAR! ♻️
                inscricaoBanco.setStatus("ATIVA");
                // Atualizamos a data para a nova inscrição (opcional, mas bom para histórico)
                inscricaoBanco.setDataInscricao(java.time.LocalDateTime.now());
                
                Inscricao atualizada = inscricaoRepository.save(inscricaoBanco);
                return ResponseEntity.ok(atualizada);
            }

            // Cenário C: Nunca se inscreveu -> Criar Novo
            inscricao.setStatus("ATIVA");
            Inscricao nova = inscricaoRepository.save(inscricao);
            return ResponseEntity.ok(nova);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erro ao processar inscrição: " + e.getMessage());
        }
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