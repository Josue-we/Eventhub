package com.eventhub.inscricoes_service.repository;

import com.eventhub.inscricoes_service.model.Inscricao;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface InscricaoRepository extends JpaRepository<Inscricao, Long> {
    
    // O Spring Data entende isso automaticamente se o campo se chama 'status'
    List<Inscricao> findByUsuarioIdAndStatus(Long usuarioId, String status);

    Optional<Inscricao> findByUsuarioIdAndEventoId(Long usuarioId, Long eventoId);
}