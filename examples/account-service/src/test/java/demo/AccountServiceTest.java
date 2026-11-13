package demo;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AccountServiceTest {
    private final AccountService service = new AccountService();

    @Test
    void missingBalanceReturnsNoContent() {
        assertEquals(204, service.statusForBalance(null));
    }

    @Test
    void zeroBalanceIsStillPresent() {
        assertEquals(200, service.statusForBalance(0));
    }

    @Test
    void positiveBalanceReturnsSuccess() {
        assertEquals(200, service.statusForBalance(100));
    }
}
