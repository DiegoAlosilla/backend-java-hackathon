package demo;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;

@Path("/accounts")
public final class AccountOverviewResource {
    private final AccountOverviewFlow flow;

    public AccountOverviewResource(AccountOverviewFlow flow) {
        this.flow = flow;
    }

    @GET
    @Path("/{id}/overview")
    public Response overview(@PathParam("id") String id) {
        return Response.ok(flow.overview(id)).build();
    }
}
