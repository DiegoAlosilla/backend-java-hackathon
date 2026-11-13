package demo;

import java.util.function.ToIntFunction;

/** Lógica del microservicio de saldos detrás del cliente del servicio de cuentas. */
public final class BalanceService {
    private final ToIntFunction<String> repository;

    public BalanceService(ToIntFunction<String> repository) {
        this.repository = repository;
    }

    public int balance(String id) {
        return repository.applyAsInt(id);
    }
}
