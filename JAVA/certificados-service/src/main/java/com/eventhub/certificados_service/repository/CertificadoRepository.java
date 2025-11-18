package com.eventhub.certificados_service.repository;

import com.eventhub.certificados_service.model.Certificado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CertificadoRepository extends JpaRepository<Certificado, Long> {
    Optional<Certificado> findByCodigoAutenticacao(String codigo);
}
