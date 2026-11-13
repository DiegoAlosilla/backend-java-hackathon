package demo;

public final class AccountService {
    public int statusForBalance(Integer balance) {
        if (balance == null) {
            return 204;
        }
        return 200;
    }
}
