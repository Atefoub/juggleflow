package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.TrickResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.Trick;
import com.juggleflow.backend.model.UserFavoriteTrick;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TrickRepository;
import com.juggleflow.backend.repository.UserFavoriteTrickRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TrickFavoriteService {

    private final StudentRepository studentRepository;
    private final TrickRepository trickRepository;
    private final UserFavoriteTrickRepository favoriteRepository;

    @Transactional(readOnly = true)
    public List<Long> listFavoriteTrickIds(String studentEmail) {
        Student student = findStudent(studentEmail);
        return favoriteRepository.findTrickIdsByUserId(student.getId());
    }

    @Transactional(readOnly = true)
    public List<TrickResponse> listFavorites(String studentEmail) {
        Student student = findStudent(studentEmail);
        return favoriteRepository.findTrickIdsByUserId(student.getId()).stream()
            .map(trickRepository::findById)
            .filter(java.util.Optional::isPresent)
            .map(opt -> TrickResponse.from(opt.get()))
            .toList();
    }

    @Transactional(readOnly = true)
    public Set<Long> favoriteIdsAmong(String studentEmail, List<Long> trickIds) {
        if (trickIds == null || trickIds.isEmpty()) {
            return Set.of();
        }
        Student student = findStudent(studentEmail);
        return favoriteRepository.findFavoriteTrickIdsAmong(student.getId(), trickIds);
    }

    @Transactional
    public void addFavorite(String studentEmail, Long trickId) {
        Student student = findStudent(studentEmail);
        Trick trick = trickRepository.findById(trickId)
            .orElseThrow(() -> new ResourceNotFoundException("Figure", trickId));

        if (favoriteRepository.existsByUser_IdAndTrick_Id(student.getId(), trickId)) {
            return;
        }

        favoriteRepository.save(UserFavoriteTrick.builder()
            .user(student)
            .trick(trick)
            .build());
    }

    @Transactional
    public void removeFavorite(String studentEmail, Long trickId) {
        Student student = findStudent(studentEmail);
        favoriteRepository.findByUser_IdAndTrick_Id(student.getId(), trickId)
            .ifPresent(favoriteRepository::delete);
    }

    private Student findStudent(String email) {
        return studentRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Élève introuvable pour cette session."));
    }
}
