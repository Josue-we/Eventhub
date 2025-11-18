package com.eventhub.presencas_service.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "presencas")
@Data
public class Presenca {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long usuarioId;

    private Long eventoId;

    private LocalDateTime dataPresenca = LocalDateTime.now();
}
