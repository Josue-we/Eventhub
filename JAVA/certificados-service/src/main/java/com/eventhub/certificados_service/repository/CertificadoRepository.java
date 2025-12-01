package com.eventhub.certificados_service.repository;

import com.eventhub.certificados_service.model.Certificado;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CertificadoRepository extends JpaRepository<Certificado, Long> {
    
    Optional<Certificado> findByCodigoAutenticacao(String codigoAutenticacao);

    // MANTÉM ESTE (usado para validação rápida)
    boolean existsByUsuarioIdAndEventoId(Long usuarioId, Long eventoId);

    // ADICIONA ESTE NOVO (para recuperar o objeto completo)
    Optional<Certificado> findByUsuarioIdAndEventoId(Long usuarioId, Long eventoId);
}