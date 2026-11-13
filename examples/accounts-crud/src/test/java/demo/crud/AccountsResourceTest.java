package demo.crud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class AccountsResourceTest {
    @TestHTTPResource("/accounts")
    URI accounts;

    @TestHTTPResource("/health")
    URI health;

    @Inject
    LocalAccountTopic topic;

    @Inject
    ObjectMapper json;

    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void registrationInvalidatesTheListAndPublishesOneEvent() throws Exception {
        HttpResponse<String> before = get(accounts);
        assertEquals(200, before.statusCode());
        int initialCount = json.readTree(before.body()).size();
        String account = """
                {"id":"demo-01","name":"Cuenta de prueba"}
                """;

        HttpResponse<String> created = post(account);
        assertEquals(201, created.statusCode());
        assertEquals(json.readTree(account), json.readTree(created.body()));
        assertEquals(409, post(account).statusCode());

        HttpResponse<String> after = get(accounts);
        assertEquals(200, after.statusCode());
        JsonNode list = json.readTree(after.body());
        assertEquals(initialCount + 1, list.size());
        assertTrue(list.findValuesAsText("id").contains("demo-01"));
        assertEquals(list, json.readTree(get(accounts).body()));
        assertEquals(List.of(new LocalAccountTopic.Event("accounts.registered", "demo-01")), topic.events());
    }

    @Test
    void healthAndInvalidPayload() throws Exception {
        HttpResponse<String> response = get(health);
        assertEquals(200, response.statusCode());
        assertEquals("UP", json.readTree(response.body()).get("status").asText());
        assertEquals(400, post("{\"id\":\"\",\"name\":\"Cuenta\"}").statusCode());
    }

    private HttpResponse<String> get(URI uri) throws Exception {
        return client.send(HttpRequest.newBuilder(uri).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(accounts).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
