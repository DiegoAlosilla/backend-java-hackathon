package demo;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AccountOverviewFlowTest {
    @Test
    void cacheMissReadsBalanceThenPublishesAndUpdatesCacheBeforeReturning() {
        List<String> calls = new ArrayList<>();
        AccountOverviewFlow.Cache cache = new AccountOverviewFlow.Cache() {
            public Integer get(String key) {
                calls.add("GET " + key);
                return null;
            }

            public void put(String key, int balance, int ttlSeconds) {
                calls.add("SET " + key + " " + balance + " " + ttlSeconds);
            }
        };
        BalanceService balances = new BalanceService(id -> {
            calls.add("BD " + id);
            return 100;
        });
        AccountOverviewFlow flow = new AccountOverviewFlow(cache, id -> {
            calls.add("Saldos " + id);
            return balances.balance(id);
        }, (topic, id, balance) -> calls.add(topic + " " + id + " " + balance));

        assertEquals(100, flow.overview("demo"));
        assertEquals(List.of("GET account:overview:demo", "Saldos demo", "BD demo",
                "account.overview.loaded demo 100", "SET account:overview:demo 100 300"), calls);
    }
}
