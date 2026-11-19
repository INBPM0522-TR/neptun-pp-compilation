package hu.inf.unideb.neptun.model;

import java.util.Random;

public enum Program {
    CS_BSC,
    CSE_BSC,
    BI_BSC;

    private static final Random RANDOM = new Random();

    public static Program next() {
        return values()[RANDOM.nextInt(values().length)];
    }
}
