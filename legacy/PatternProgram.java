import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.Scanner;

/**
 * Iterative pattern program: random Z selection, derived C5–C16,
 * conditional restart, C17/C20 checks per specification.
 */
public class PatternProgram {

    /** Row-wise pattern: index 0 = top row, 3 = bottom row. 'X' and 'Y'. */
    private static final String[] Z = {
        null,
        "XXXX", // Z1
        "YXYX", // Z2
        "XYXX", // Z3
        "YXXY", // Z4
        "YYYX", // Z5
        "YYXY", // Z6
        "YXXX", // Z7
        "YYXX", // Z8
        "XXYY", // Z9
        "XXXY", // Z10
        "YXYY", // Z11
        "XYYY", // Z12
        "XYYX", // Z13
        "XXYX", // Z14
        "XYXY", // Z15
        "YYYY"  // Z16
    };

    private static char add(char a, char b) {
        boolean xA = a == 'X';
        boolean xB = b == 'X';
        // XNOR: same -> Y, different -> X
        if (xA == xB) {
            return 'Y';
        }
        return 'X';
    }

    private static String addColumns(String... cols) {
        if (cols.length == 0) {
            return "";
        }
        int len = cols[0].length();
        StringBuilder sb = new StringBuilder(len);
        for (int r = 0; r < len; r++) {
            char acc = cols[0].charAt(r);
            for (int i = 1; i < cols.length; i++) {
                acc = add(acc, cols[i].charAt(r));
            }
            sb.append(acc);
        }
        return sb.toString();
    }

    private static String addPair(String c1, String c2) {
        return addColumns(c1, c2);
    }

    /** 1-based Z index from pattern string, or -1 if unknown. */
    private static int indexOfZ(String pattern) {
        for (int i = 1; i <= 16; i++) {
            if (Z[i].equals(pattern)) {
                return i;
            }
        }
        return -1;
    }

    private static boolean isZ1Z7OrZ11(String c15) {
        return c15.equals(Z[1]) || c15.equals(Z[7]) || c15.equals(Z[11]);
    }

    private static boolean c20MatchesSpecial(String c20) {
        return c20.equals(Z[1]) || c20.equals(Z[6]) || c20.equals(Z[10]) || c20.equals(Z[15]);
    }

    /** Count row positions where two 4-row patterns agree. */
    private static int matchingPlaces(String a, String b) {
        int n = Math.min(a.length(), b.length());
        int count = 0;
        for (int i = 0; i < n; i++) {
            if (a.charAt(i) == b.charAt(i)) {
                count++;
            }
        }
        return count;
    }

    private static String[] runOneStart(Random rng) {
        String[] c = new String[17]; // 1..16 used; c[0] unused

        int i1 = 1 + rng.nextInt(16);
        int i2 = 1 + rng.nextInt(16);
        int i3 = 1 + rng.nextInt(16);
        int i4 = 1 + rng.nextInt(16);
        c[1] = Z[i1];
        c[2] = Z[i2];
        c[3] = Z[i3];
        c[4] = Z[i4];

        // C1..C4 copied right-to-left -> C5..C8: C8=C1, C7=C2, C6=C3, C5=C4
        c[5] = c[4];
        c[6] = c[3];
        c[7] = c[2];
        c[8] = c[1];

        c[9] = addPair(c[1], c[2]);
        c[10] = addPair(c[3], c[4]);
        c[11] = addPair(c[5], c[6]);
        c[12] = addPair(c[7], c[8]);
        c[13] = addPair(c[9], c[10]);
        c[14] = addPair(c[11], c[12]);
        c[15] = addPair(c[13], c[14]);
        c[16] = addPair(c[15], c[1]);

        return c;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Random rng = new Random();

        System.out.print("Enter the number of iterations (L): ");
        int l = scanner.nextInt();
        System.out.println("Number of iterations L = " + l);

        for (int iteration = 1; iteration <= l; iteration++) {
            System.out.println();
            System.out.println("========== Iteration " + iteration + " ==========");

            String[] c;
            while (true) {
                c = runOneStart(rng);
                if (!isZ1Z7OrZ11(c[15])) {
                    break;
                }
                // C15 is Z1, Z7, or Z11 -> go to Start
            }

            String c17 = addColumns(c[1], c[4], c[7], c[8]);
            String c20Raw = addColumns(c[3], c[7], c[11], c[15]);

            String c20Label;
            if (!c20MatchesSpecial(c20Raw)) {
                c20Label = "Nil";
            } else {
                int zIdx = indexOfZ(c20Raw);
                c20Label = "Z" + zIdx + " (" + c20Raw + ")";
                System.out.println("C20 matches Z1, Z6, Z10, or Z15 -> printing C20: " + c20Label);
            }
            if ("Nil".equals(c20Label)) {
                System.out.println("C20 is not Z1, Z6, Z10, or Z15 -> C20 = Nil");
            }

            List<Integer> c17Matches = new ArrayList<>();
            for (int i = 1; i <= 16; i++) {
                if (matchingPlaces(c17, c[i]) >= 4) {
                    c17Matches.add(i);
                }
            }

            if (!c17Matches.isEmpty()) {
                System.out.println();
                System.out.println("C17 equals one or more of C1..C16 in four or more places (full row match).");
                System.out.println("Iteration: " + iteration);
                System.out.println();
                System.out.printf("%-12s %-8s %-10s%n", "C index", "Pattern", "Z label");
                System.out.println("--------------------------------------------");
                for (int idx : c17Matches) {
                    int zLabel = indexOfZ(c[idx]);
                    String zStr = zLabel >= 0 ? "Z" + zLabel : "?";
                    System.out.printf("C%-11d %-8s %-10s%n", idx, c[idx], zStr);
                }
                System.out.println("--------------------------------------------");
                System.out.println("C17 = " + c17);
            }
        }

        System.out.println();
        System.out.println("END after " + l + " iteration(s).");
        scanner.close();
    }
}
