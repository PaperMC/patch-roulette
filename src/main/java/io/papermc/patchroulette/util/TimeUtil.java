package io.papermc.patchroulette.util;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class TimeUtil {
    private TimeUtil() {
    }

    public record TimeInterval(LocalDateTime start, LocalDateTime end) {}

    public static List<TimeInterval> mergeOverlappingIntervals(List<TimeInterval> intervals) {
        if (intervals.isEmpty()) {
            return intervals;
        }

        List<TimeInterval> merged = new ArrayList<>();
        TimeInterval current = intervals.getFirst();

        for (int i = 1; i < intervals.size(); i++) {
            TimeInterval next = intervals.get(i);

            // If current and next overlap
            if (current.end().isAfter(next.start()) || current.end().equals(next.start())) {
                // Merge them
                current = new TimeInterval(
                    current.start(),
                    current.end().isAfter(next.end()) ? current.end() : next.end()
                );
            } else {
                merged.add(current);
                current = next;
            }
        }

        merged.add(current);
        return merged;
    }

    // Calculate total duration from a list of non-overlapping intervals
    public static Duration calculateDuration(List<TimeInterval> intervals) {
        Duration total = Duration.ZERO;

        for (TimeInterval interval : intervals) {
            total = total.plus(Duration.between(interval.start(), interval.end()));
        }

        return total;
    }
}
