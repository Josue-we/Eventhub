package com.eventhub.inscricoes_service.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "inscricoes")
@Data
public class Inscricao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long usuarioId;

    private Long eventoId;

    private LocalDateTime dataInscricao = LocalDateTime.now();

    private String status = "ATIVA";  // ATIVA ou CANCELADA
}
