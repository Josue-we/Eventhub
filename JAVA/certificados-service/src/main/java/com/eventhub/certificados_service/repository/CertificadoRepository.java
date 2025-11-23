package com.eventhub.certificados_service.repository;

import com.eventhub.certificados_service.model.Certificado;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CertificadoRepository extends JpaRepository<Certificado, Long> {
    
    // Busca para a validação pública/privada do certificado
    Optional<Certificado> findByCodigoAutenticacao(String codigoAutenticacao);

    // Evita duplicidade de emissão
    boolean existsByUsuarioIdAndEventoId(Long usuarioId, Long eventoId);
}