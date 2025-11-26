package com.eventhub.emails_service.service;

import com.eventhub.emails_service.dto.EmailRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void enviarEmail(EmailRequest request) {

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(request.getTo());
        message.setFrom("eventhub@noreply.com");
        message.setSubject(request.getSubject());
        message.setText(request.getBody());

        mailSender.send(message);
    }
}
