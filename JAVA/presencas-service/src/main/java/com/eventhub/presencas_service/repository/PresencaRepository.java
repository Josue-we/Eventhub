package com.eventhub.presencas_service.repository;

import com.eventhub.presencas_service.model.Presenca;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PresencaRepository extends JpaRepository<Presenca, Long> {
}
