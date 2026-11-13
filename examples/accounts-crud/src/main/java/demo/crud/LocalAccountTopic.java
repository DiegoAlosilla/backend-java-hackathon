package demo.crud;

import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class LocalAccountTopic {
    private static final Logger LOG = Logger.getLogger(LocalAccountTopic.class);
    private final List<Event> events = new ArrayList<>();

    synchronized void publish(String topic, String accountId) {
        events.add(new Event(topic, accountId));
        LOG.infof("Evento publicado en %s para %s (adaptador local)", topic, accountId);
    }

    synchronized List<Event> events() {
        return List.copyOf(events);
    }

    record Event(String topic, String accountId) {}
}
