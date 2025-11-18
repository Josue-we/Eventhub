package com.eventhub.inscricoes_service.repository;

import com.eventhub.inscricoes_service.model.Inscricao;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InscricaoRepository extends JpaRepository<Inscricao, Long> {
}
