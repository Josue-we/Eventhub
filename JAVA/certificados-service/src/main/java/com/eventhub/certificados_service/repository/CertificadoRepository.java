package com.eventhub.certificados_service.repository;

import com.eventhub.certificados_service.model.Certificado;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CertificadoRepository extends JpaRepository<Certificado, Long> {
    
    // Busca pelo código UUID (para a validação pública)
    Optional<Certificado> findByCodigoAutenticacao(String codigoAutenticacao);

    // Verifica apenas se existe (True/False)
    boolean existsByUsuarioIdAndEventoId(Long usuarioId, Long eventoId);

    // --- NOVO: Busca o objeto completo (para devolver se já existir) ---
    Optional<Certificado> findByUsuarioIdAndEventoId(Long usuarioId, Long eventoId);
}