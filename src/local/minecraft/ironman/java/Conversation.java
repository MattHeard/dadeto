package net.mattheard.ironman;

import java.util.regex.*;

final class Conversation {
  private static final Pattern ADDRESS=Pattern.compile("(?i)^\\s*iron\\s*man\\s*[, :]\\s*(.+)$");
  static String message(String input) {Matcher match=ADDRESS.matcher(input);return match.matches()?match.group(1).strip():null;}
  static void check() {
    if(!"hello".equals(message("Iron Man, hello"))||!"help me".equals(message("ironman: help me"))||message("ordinary chat")!=null||message("Iron Man")!=null)throw new AssertionError("Conversation addressing failed");
  }
}
