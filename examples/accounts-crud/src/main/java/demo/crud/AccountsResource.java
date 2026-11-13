package demo.crud;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;

@Path("/accounts")
@Produces("application/json")
public class AccountsResource {
    private final AccountService service;

    public AccountsResource(AccountService service) {
        this.service = service;
    }

    @POST
    @Consumes("application/json")
    public Response register(Account account) {
        if (account == null || account.id() == null || !account.id().matches("[a-zA-Z0-9-]{1,32}")
                || account.name() == null || account.name().isBlank() || account.name().length() > 80) {
            return Response.status(400).entity(Map.of("message", "Cuenta inválida")).build();
        }
        if (!service.register(account)) {
            return Response.status(409).entity(Map.of("message", "La cuenta ya existe")).build();
        }
        return Response.status(201).entity(account).build();
    }

    @GET
    public List<Account> list() {
        return service.list();
    }
}
