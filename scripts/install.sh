#!/bin/sh
# Installs the latest slagent release to ~/Applications/slagent.app:
#   curl -fsSL https://raw.githubusercontent.com/slavkobojanic/slagent/main/scripts/install.sh | sh
set -eu

base="https://github.com/slavkobojanic/slagent/releases/latest/download"
installed="$HOME/Applications/slagent.app"
legacy="/Applications/slagent.app"
lsregister=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
ESC=$(printf '\033')

# Saturn from the app icon, drawn two pixels per terminal cell with half blocks.
# a b c are the planet's bands, r s the ring (R S where it passes in front of the
# planet), and x y two sets of stars that twinkle out of step.
LOGO='
...x.............................y......
................aaaaaaaa................
.........y.....aaaaaaaaaa..rrrrrrrrrrr..
..............aaaaaaaaaaaarrrrrrrrrrrrr.
.x...........aaaaaaaaaaaaaarssssssrrrrr.
............bbbbbbbbbbbbbbbb....sssrrrr.
............aaaaaaaaaaaaaaaa....ssrrrr..
.........rrraaaaaaaaaaaaaaab...srrrrr...
.......rrrrraaaaaaaaaaaaaabbbsrrrrr....y
.....rrrrrsbbbbbbbbbbbbbbcSSrrrrr.......
...rrrrrs...cccccccccccSSRRRrrr.........
..rrrrss....bbbbbbbbSSRRRRRR............
.rrrrsss....bbbbSSRRRRRRRRcc.........x..
.rrrrrssssssrRRRRRRRRRRcccc.............
yrrrrrrrrrrrrrRRRRRccccccc..............
..rrrrrrrrrrrr.bbbbbbcccc...............
......y.........bbbbcccc......x.........
........................................
'

unicode() {
  case "${LC_ALL:-${LC_CTYPE:-${LANG:-}}}" in *UTF-8*|*utf-8*|*UTF8*|*utf8*) return 0 ;; esac
  case "${TERM_PROGRAM:-}" in Apple_Terminal|iTerm.app|vscode|WezTerm|ghostty|WarpTerminal) return 0 ;; esac
  return 1
}

# The logo, colors and progress bars need a color terminal; logs and NO_COLOR get plain lines.
setup_terminal() {
  fancy=
  if [ -t 1 ] && [ "${TERM:-dumb}" != dumb ] && [ -z "${NO_COLOR:-}" ] && unicode; then
    fancy=1
  fi
  if unicode; then
    check='✓' cross='✗' bang='!'
  else
    check='ok' cross='error:' bang='warning:'
  fi
  if [ -n "$fancy" ]; then
    bold="${ESC}[1m" dim="${ESC}[2m" green="${ESC}[32m" red="${ESC}[31m" yellow="${ESC}[33m" reset="${ESC}[0m"
  else
    bold= dim= green= red= yellow= reset=
  fi
}

clear_line() {
  [ -z "$fancy" ] || printf '\r%s[0m%s[K' "$ESC" "$ESC"
}

ok() {
  clear_line
  printf '  %s%s%s %s\n' "$green" "$check" "$reset" "$1"
}

warn() {
  clear_line
  printf '  %s%s%s %s\n' "$yellow" "$bang" "$reset" "$1" >&2
}

fail() {
  clear_line
  printf '  %s%s%s %s\n' "$red" "$cross" "$reset" "$1" >&2
  exit 1
}

# Sets PX to the 256-color code for one logo pixel at row $2, column $3, or to nothing
# while that part of the logo hasn't been revealed yet.
logo_pixel() {
  case "$1" in
    a) [ "$2" -lt "$planet" ] && PX=223 || PX= ;;
    b) [ "$2" -lt "$planet" ] && PX=180 || PX= ;;
    c) [ "$2" -lt "$planet" ] && PX=137 || PX= ;;
    r|s|R|S)
      if [ "$3" -lt "$ring" ]; then
        if [ "$3" -ge "$glint" ] && [ "$3" -le $((glint + 2)) ]; then
          PX=230
        else
          case "$1" in r|R) PX=187 ;; *) PX=144 ;; esac
        fi
      else
        # Until the ring sweeps past, the planet shows through where the ring will be.
        case "$1" in [RS]) [ "$2" -lt "$planet" ] && PX=180 || PX= ;; *) PX= ;; esac
      fi
      ;;
    *) PX= ;;
  esac
}

# Redraws the logo over its previous frame. planet is how many pixel rows of the planet
# show, ring how many columns of the ring, glint the column of the light running along
# the ring, and stars which stars are lit (0 none, 1 all dim, 2 and 3 alternate).
draw_logo() {
  planet=$1 ring=$2 glint=$3 stars=$4
  out="${ESC}[9A"
  y=0
  top=
  for row in $LOGO; do
    if [ -z "$top" ]; then
      top=$row
      continue
    fi
    bot=$row
    line="  "
    x=0
    while [ -n "$top" ]; do
      t=${top%"${top#?}"} top=${top#?}
      b=${bot%"${bot#?}"} bot=${bot#?}
      logo_pixel "$t" "$y" "$x"
      tc=$PX
      logo_pixel "$b" $((y + 1)) "$x"
      bc=$PX
      if [ -n "$tc" ] && [ -n "$bc" ]; then
        if [ "$tc" = "$bc" ]; then
          line="$line${ESC}[38;5;${tc}m█"
        else
          line="$line${ESC}[38;5;${tc};48;5;${bc}m▀${ESC}[0m"
        fi
      elif [ -n "$tc" ]; then
        line="$line${ESC}[38;5;${tc}m▀"
      elif [ -n "$bc" ]; then
        line="$line${ESC}[38;5;${bc}m▄"
      else
        case "$t$stars" in
          x1|y1|x3|y2) line="$line${ESC}[38;5;243m·" ;;
          x2|y3) line="$line${ESC}[38;5;231m✦" ;;
          *) line="$line " ;;
        esac
      fi
      x=$((x + 1))
    done
    out="$out$line${ESC}[0m${ESC}[K
"
    top=
    y=$((y + 2))
  done
  printf '%s' "$out"
}

# Stars come out, the planet fills in from the top, the ring sweeps across it, and a
# glint runs along the ring.
animate_logo() {
  printf '%s[?25l\n\n\n\n\n\n\n\n\n\n' "$ESC"
  draw_logo 0 0 -9 1
  sleep 0.12
  draw_logo 0 0 -9 2
  sleep 0.12
  n=2
  while [ "$n" -le 18 ]; do
    draw_logo "$n" 0 -9 2
    sleep 0.02
    n=$((n + 2))
  done
  n=4
  while [ "$n" -le 44 ]; do
    draw_logo 18 "$n" -9 3
    sleep 0.02
    n=$((n + 4))
  done
  n=-3
  while [ "$n" -le 41 ]; do
    draw_logo 18 44 "$n" $((n / 8 % 2 + 2))
    sleep 0.015
    n=$((n + 3))
  done
  draw_logo 18 44 -9 2
}

spinner() {
  case $(($1 % 10)) in
    0) SPIN='⠋' ;; 1) SPIN='⠙' ;; 2) SPIN='⠹' ;; 3) SPIN='⠸' ;; 4) SPIN='⠼' ;;
    5) SPIN='⠴' ;; 6) SPIN='⠦' ;; 7) SPIN='⠧' ;; 8) SPIN='⠇' ;; *) SPIN='⠏' ;;
  esac
}

# Draws one frame of a progress line. filled is how many of the bar's cells are done,
# or -1 to sweep a comet across it when there's nothing to measure.
draw_bar() {
  step=$1 filled=$2 label=$3 width=24
  bar=
  i=0
  while [ "$i" -lt "$width" ]; do
    if [ "$filled" -lt 0 ]; then
      case $((step % (width + 8) - i)) in
        0|1) c=230 ;; 2|3) c=223 ;; 4|5) c=180 ;; 6|7) c=137 ;; *) c= ;;
      esac
    elif [ "$i" -lt "$filled" ]; then
      # Tan to cream along the bar, with a glint running through the filled part.
      if [ "$i" -eq $((step % (filled + 6))) ]; then
        c=230
      elif [ "$i" -lt 8 ]; then
        c=137
      elif [ "$i" -lt 16 ]; then
        c=180
      else
        c=223
      fi
    else
      c=
    fi
    if [ -n "$c" ]; then
      bar="$bar${ESC}[38;5;${c}m█"
    else
      bar="$bar${ESC}[38;5;238m░"
    fi
    i=$((i + 1))
  done
  spinner "$step"
  printf '\r%s[K  %s[38;5;187m%s %s%s[0m %s' "$ESC" "$ESC" "$SPIN" "$bar" "$ESC" "$label"
}

mb() {
  printf '%d.%d' $(($1 / 1048576)) $(($1 % 1048576 * 10 / 1048576))
}

# Runs in the background and redraws the progress line until it's killed. With a file
# and its expected size the bar tracks the download, otherwise it sweeps.
animate_progress() {
  # A subshell must never run the main cleanup, which deletes the download directory.
  trap - EXIT INT TERM HUP
  step=0
  while :; do
    if [ -n "$2" ] && [ "$3" -gt 0 ]; then
      size=$(stat -f %z "$2" 2>/dev/null || echo 0)
      draw_bar "$step" $((size * 24 / $3)) "$1  $(mb "$size") of $(mb "$3") MB"
    else
      draw_bar "$step" -1 "$1"
    fi
    step=$((step + 1))
    sleep 0.08
  done
}

# with_progress label file size command...: runs the command under a progress line.
with_progress() {
  if [ -z "$fancy" ]; then
    printf '  %s...\n' "$1"
    shift 3
    "$@"
    return
  fi
  animate_progress "$1" "$2" "$3" &
  anim_pid=$!
  shift 3
  if "$@"; then status=0; else status=$?; fi
  kill "$anim_pid" 2>/dev/null || true
  wait "$anim_pid" 2>/dev/null || true
  anim_pid=
  clear_line
  return "$status"
}

verify_checksum() {
  (cd "$tmp" && shasum -a 256 -c "$zip.sha256" >/dev/null 2>&1)
}

install_app() {
  mkdir -p "$HOME/Applications" &&
    rm -rf "$installed" &&
    ditto "$tmp/app/slagent.app" "$installed" &&
    "$lsregister" -f "$installed"
}

prompt_open() {
  [ -t 1 ] && (: <>/dev/tty) 2>/dev/null || return 0
  [ -z "$fancy" ] || printf '%s[?25h' "$ESC"
  printf '\n  Open slagent now? [Y/n] '
  answer=
  read -r answer </dev/tty || answer=n
  case "$answer" in n|N|no|No|NO) return 0 ;; esac
  open "$installed"
}

cleanup() {
  for pid in ${feed_pid:-} ${anim_pid:-}; do
    kill "$pid" 2>/dev/null || true
  done
  [ -z "$fancy" ] || printf '%s[0m%s[?25h' "$ESC" "$ESC"
  rm -rf "$tmp"
}

# Everything runs from main so a truncated `curl | sh` download can't run half a script.
main() {
  setup_terminal
  tmp="$(mktemp -d)"
  feed_pid=
  anim_pid=
  trap cleanup EXIT
  trap 'printf "\n"; exit 130' INT TERM HUP

  # The updater feed names the zip in the newest non-prerelease release, which saves a
  # call to the rate-limited GitHub API. Fetch it while the logo animates.
  curl -fsSL "$base/latest-mac.yml" -o "$tmp/latest-mac.yml" 2>/dev/null &
  feed_pid=$!

  if [ -n "$fancy" ]; then
    animate_logo
  fi
  printf '\n  %sslagent installer%s\n  %sA desktop coding agent for macOS, built on Pi%s\n\n' "$bold" "$reset" "$dim" "$reset"

  [ "$(uname -s)" = Darwin ] || fail "slagent only runs on macOS"
  # uname -m says x86_64 under Rosetta, so ask the hardware instead.
  [ "$(sysctl -n hw.optional.arm64 2>/dev/null || true)" = 1 ] || fail "slagent only ships for Apple Silicon Macs"

  if wait "$feed_pid"; then feed_ok=1; else feed_ok=; fi
  feed_pid=
  [ -n "$feed_ok" ] || fail "Couldn't reach GitHub to find the latest release"
  version="$(sed -n 's/^version: *//p' "$tmp/latest-mac.yml")"
  zip="$(sed -n 's/^path: *//p' "$tmp/latest-mac.yml")"
  total="$(sed -n 's/^ *size: *//p' "$tmp/latest-mac.yml" | head -n 1)"
  [ -n "$version" ] && [ -n "$zip" ] || fail "Couldn't read latest-mac.yml"
  case "$total" in '' | *[!0-9]*) total=0 ;; esac

  current=
  # PlistBuddy reports a missing file on stdout, so only ask it about one that exists.
  if [ -f "$installed/Contents/Info.plist" ]; then
    current="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$installed/Contents/Info.plist" 2>/dev/null || true)"
  fi
  if [ "$current" = "$version" ]; then
    ok "slagent $version is already installed and up to date"
    printf '\n'
    exit 0
  fi
  if [ -n "$current" ]; then
    ok "Found slagent $version (you have $current)"
  else
    ok "Found slagent $version"
  fi

  with_progress "Downloading" "$tmp/$zip" "$total" curl -fsSL "$base/$zip" -o "$tmp/$zip" ||
    fail "Couldn't download $zip"
  curl -fsSL "$base/$zip.sha256" -o "$tmp/$zip.sha256" || fail "Couldn't download $zip.sha256"
  ok "Downloaded slagent $version ($(mb "$(stat -f %z "$tmp/$zip")") MB)"

  with_progress "Verifying" "" 0 verify_checksum || fail "$zip doesn't match its checksum"
  ok "Checksum matches"

  # ditto keeps the framework symlinks and the stapled signature intact; unzip does not.
  with_progress "Unpacking" "" 0 ditto -x -k "$tmp/$zip" "$tmp/app" || fail "Couldn't unpack $zip"
  [ -d "$tmp/app/slagent.app" ] || fail "$zip doesn't contain slagent.app"

  quit=
  if pkill -f "$installed/Contents/MacOS/"; then quit=1; fi
  if pkill -f "$legacy/Contents/MacOS/"; then quit=1; fi
  [ -z "$quit" ] || ok "Quit the running slagent"
  # A second copy with the same bundle id confuses Launch Services and the privacy panes.
  if [ -d "$legacy" ]; then
    "$lsregister" -u "$legacy" || true
    if rm -rf "$legacy" 2>/dev/null; then
      ok "Removed the old copy in /Applications"
    else
      warn "Couldn't remove $legacy. Delete it so macOS only sees one copy."
    fi
  fi

  with_progress "Installing" "" 0 install_app || fail "Couldn't install to $installed"
  ok "Installed to ~${installed#"$HOME"}"

  if [ -n "$current" ]; then
    printf '\n  %sUpdated slagent from %s to %s.%s\n' "$bold" "$current" "$version" "$reset"
  else
    printf '\n  %sslagent %s is ready.%s\n' "$bold" "$version" "$reset"
  fi
  prompt_open
  printf '\n'
}

main "$@"
