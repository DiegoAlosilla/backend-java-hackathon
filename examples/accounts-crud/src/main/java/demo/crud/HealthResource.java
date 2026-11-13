package demo.crud;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;

import java.util.Map;

@Path("/health")
public class HealthResource {
    @GET
    @Produces("application/json")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
