package demo.crud;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class LocalAccountDatabase {
    private final Map<String, Account> rows = new LinkedHashMap<>();

    boolean insert(Account account) {
        return rows.putIfAbsent(account.id(), account) == null;
    }

    List<Account> selectAll() {
        return List.copyOf(rows.values());
    }
}
