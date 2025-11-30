package com.eventhub.eventos_service.controller;

import com.eventhub.eventos_service.model.Evento;
import com.eventhub.eventos_service.repository.EventoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/eventos")
@CrossOrigin(origins = "*") // <--- Permitir acesso Web
public class EventoController {

    @Autowired
    private EventoRepository eventoRepository;

    @GetMapping
    public List<Evento> listarEventos() {
        return eventoRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Evento> buscarPorId(@PathVariable Long id) {
        Optional<Evento> evento = eventoRepository.findById(id);
        return evento.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public Evento criarEvento(@RequestBody Evento evento) {
        return eventoRepository.save(evento);
    }
}