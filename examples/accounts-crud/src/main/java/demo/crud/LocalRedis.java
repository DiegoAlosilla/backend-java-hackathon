package demo.crud;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class LocalRedis {
    private final Map<String, Account> accounts = new HashMap<>();
    private List<Account> cachedList;

    void setAccount(Account account) {
        accounts.put("accounts:" + account.id(), account);
    }

    void invalidateList() {
        cachedList = null;
    }

    Optional<List<Account>> getList() {
        return Optional.ofNullable(cachedList);
    }

    void setList(List<Account> accounts) {
        cachedList = List.copyOf(accounts);
    }
}
