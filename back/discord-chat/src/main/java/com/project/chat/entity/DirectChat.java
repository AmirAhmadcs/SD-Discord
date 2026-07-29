package com.project.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "direct_chats", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"participant_one", "participant_two"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DirectChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @Column(name = "participant_one", nullable = false)
    private String participantOne;

    @Column(name = "participant_two", nullable = false)
    private String participantTwo;
}

