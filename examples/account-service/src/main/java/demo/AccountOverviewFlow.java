package demo;

import java.util.function.Function;

/** Ejemplo de orquestación. El entorno real suministra los adaptadores. */
public final class AccountOverviewFlow {
    private final Cache cache;
    private final Function<String, Integer> balanceClient;
    private final Publisher publisher;

    public AccountOverviewFlow(Cache cache, Function<String, Integer> balanceClient, Publisher publisher) {
        this.cache = cache;
        this.balanceClient = balanceClient;
        this.publisher = publisher;
    }

    public int overview(String id) {
        String key = "account:overview:" + id;
        Integer cached = cache.get(key);
        if (cached != null) {
            return cached;
        }

        int balance = balanceClient.apply(id);
        publisher.publish("account.overview.loaded", id, balance);
        cache.put(key, balance, 300);
        return balance;
    }

    public interface Cache {
        Integer get(String key);
        void put(String key, int balance, int ttlSeconds);
    }

    public interface Publisher {
        void publish(String topic, String id, int balance);
    }
}
