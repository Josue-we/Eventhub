package com.eventhub.eventos_service.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "eventos")
@Data
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //private String data;
    
    private String descricao;
    
    private String local;
    
    private String nome;
}
