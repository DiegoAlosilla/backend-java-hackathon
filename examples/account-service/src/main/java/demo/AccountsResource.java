package demo;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;

@Path("/accounts")
public final class AccountsResource {
    private final AccountService service = new AccountService();

    @GET
    @Path("/{id}/balance")
    public Response balance(@PathParam("id") String id) {
        Integer balance = "demo".equals(id) ? 100 : null;
        int status = service.statusForBalance(balance);
        return status == 204 ? Response.noContent().build()
                : Response.ok(balance).build();
    }
}
