package com.project.auth.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.ClientRepresentation;
import org.keycloak.representations.idm.RealmRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class KeycloakAutoSetup implements CommandLineRunner {

    @Value("${keycloak.admin.server-url}")
    private String serverUrl;

    @Value("${keycloak.admin.target-realm}")
    private String targetRealm;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.admin.client-secret}")
    private String clientSecret;

    @Value("${keycloak.admin.master-username}")
    private String masterUsername;

    @Value("${keycloak.admin.master-password}")
    private String masterPassword;

    // آدرس دقیقی که صفحه سوگر گیت‌وی برای گرفتن توکن به کی‌کلاک برمی‌گرداند
    private static final String SWAGGER_REDIRECT_URI = "http://localhost:8000/swagger-ui/oauth2-redirect.html";

    @Override
    public void run(String... args) {
        log.info("=== Starting Keycloak Auto-Setup ===");

        try (Keycloak masterAdmin = Keycloak.getInstance(
            serverUrl,
            "master",
            masterUsername,
            masterPassword,
            "admin-cli",
            (String) null)) {

            setupRealm(masterAdmin);
            setupClient(masterAdmin);

        } catch (Exception e) {
            log.error("Failed to connect to Keycloak. Make sure Keycloak is running on {}",
                serverUrl, e);
        }

        log.info("=== Keycloak Auto-Setup Finished ===");
    }

    private void setupRealm(Keycloak masterAdmin) {
        Optional<RealmRepresentation> realmOptional = masterAdmin.realms().findAll().stream()
            .filter(r -> r.getRealm().equals(targetRealm))
            .findFirst();

        if (realmOptional.isEmpty()) {
            log.warn("Realm '{}' not found. Creating it now...", targetRealm);

            RealmRepresentation newRealm = new RealmRepresentation();
            newRealm.setRealm(targetRealm);
            newRealm.setEnabled(true);
            newRealm.setRegistrationEmailAsUsername(false);

            masterAdmin.realms().create(newRealm);
            log.info("Realm '{}' created successfully.", targetRealm);
        } else {
            log.info("Realm '{}' already exists. Skipping creation.", targetRealm);
        }
    }

    private void setupClient(Keycloak masterAdmin) {
        List<ClientRepresentation> existingClients = masterAdmin.realm(targetRealm).clients()
            .findByClientId(clientId);

        if (existingClients.isEmpty()) {
            log.warn("Client '{}' not found in realm '{}'. Creating it now...", clientId, targetRealm);

            ClientRepresentation newClient = new ClientRepresentation();
            newClient.setClientId(clientId);
            newClient.setSecret(clientSecret);
            newClient.setEnabled(true);
            newClient.setPublicClient(false);
            newClient.setDirectAccessGrantsEnabled(true);
            newClient.setStandardFlowEnabled(true);

            // ✅ اضافه کردن آدرس سوگر به کلاینت جدید
            newClient.setRedirectUris(List.of(SWAGGER_REDIRECT_URI));

            masterAdmin.realm(targetRealm).clients().create(newClient);
            log.info("Client '{}' created successfully.", clientId);

        } else {
            log.info("Client '{}' already exists. Checking configuration...", clientId);
            String clientUuid = existingClients.get(0).getId();
            ClientRepresentation existingClient = masterAdmin.realm(targetRealm).clients()
                .get(clientUuid).toRepresentation();

            boolean needsUpdate = false;

            // 1. چک کردن سکرت کد
            if (!clientSecret.equals(existingClient.getSecret())) {
                log.warn("Client secret mismatch! Updating secret for client '{}'...", clientId);
                existingClient.setSecret(clientSecret);
                needsUpdate = true;
            }

            // 2. چک کردن اینکه آیا آدرس سوگر در لیست Redirect URI ها هست یا خیر
            List<String> currentUris = existingClient.getRedirectUris();
            if (currentUris == null) {
                currentUris = new ArrayList<>();
            }

            if (!currentUris.contains(SWAGGER_REDIRECT_URI)) {
                log.warn("Swagger redirect URI missing. Adding it to client '{}'...", clientId);
                currentUris.add(SWAGGER_REDIRECT_URI);
                existingClient.setRedirectUris(currentUris);
                needsUpdate = true;
            }

            // اگر تغییری ایجاد شده بود، کلاینت را آپدیت کن
            if (needsUpdate) {
                masterAdmin.realm(targetRealm).clients().get(clientUuid).update(existingClient);
                log.info("Client '{}' updated successfully with new settings.", clientId);
            } else {
                log.info("Client '{}' is fully up to date. No changes needed.", clientId);
            }
        }
    }
}