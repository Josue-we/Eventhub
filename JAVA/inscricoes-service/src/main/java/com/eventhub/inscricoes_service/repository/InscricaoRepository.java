package com.eventhub.inscricoes_service.repository;

import com.eventhub.inscricoes_service.model.Inscricao;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface InscricaoRepository extends JpaRepository<Inscricao, Long> {
    
    // Busca para evitar duplicidade
    Optional<Inscricao> findByUsuarioIdAndEventoId(Long usuarioId, Long eventoId);

    // Busca para listar todas as inscrições de um usuário específico
    List<Inscricao> findByUsuarioId(Long usuarioId);
}