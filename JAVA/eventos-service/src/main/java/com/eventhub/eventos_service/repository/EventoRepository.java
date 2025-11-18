package com.eventhub.eventos_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.eventhub.eventos_service.model.Evento;

public interface EventoRepository extends JpaRepository<Evento, Long> {
}
