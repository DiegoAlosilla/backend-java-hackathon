package demo.crud;

import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class AccountService {
    private static final Logger LOG = Logger.getLogger(AccountService.class);
    private final LocalAccountDatabase database;
    private final LocalRedis redis;
    private final LocalAccountTopic topic;

    public AccountService(LocalAccountDatabase database, LocalRedis redis, LocalAccountTopic topic) {
        this.database = database;
        this.redis = redis;
        this.topic = topic;
    }

    public synchronized boolean register(Account account) {
        if (!database.insert(account)) {
            return false;
        }
        redis.setAccount(account);
        redis.invalidateList();
        topic.publish("accounts.registered", account.id());
        return true;
    }

    public synchronized List<Account> list() {
        Optional<List<Account>> cached = redis.getList();
        if (cached.isPresent()) {
            LOG.info("GET /accounts: Redis HIT");
            return cached.get();
        }
        LOG.info("GET /accounts: Redis MISS, consulta a la base de datos");
        List<Account> accounts = database.selectAll();
        redis.setList(accounts);
        return accounts;
    }
}
