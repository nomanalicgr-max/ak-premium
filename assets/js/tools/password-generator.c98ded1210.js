/* AK Premium v12 — password-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 tools: pure logic (testable) ---------- */

function generatePassword(length, opts, randInt) {
  const rand = randInt || defaultRandInt;
  const sets = [];
  if (opts.upper) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (opts.lower) sets.push("abcdefghijklmnopqrstuvwxyz");
  if (opts.numbers) sets.push("0123456789");
  if (opts.symbols) sets.push("!@#$%^&*()-_=+[]{};:,.<>?");
  if (!sets.length) return { error: "Please select at least one character set." };
  if (length < sets.length) return { error: "Length must be at least the number of selected character sets." };
  /* Excluding ambiguous characters drops 0, O, 1, l and I, so a password
     copied by hand is never misread. */
  const clean = opts.excludeAmbiguous ? sets.map((s) => s.replace(/[0O1lI]/g, "")).filter((s) => s.length > 0) : sets;
  if (!clean.length) return { error: "Excluding ambiguous characters left no characters to use. Please pick another set." };
  const all = clean.join("");
  const chars = clean.map((s) => s[rand(s.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = rand(i + 1); const tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp; }
  return { password: chars.join("") };
}

/* ---------- Phase 1 handlers: Everyday ---------- */

function passphraseWords() {
  return "abacus ablaze abridge absinthe accent accurate acorn acting activist aeration affected affix afloat aftermath agenda aging agreeably ahoy alarm alias alive aloe alphabet alumni ambiance ambush amicably ammonium ample amusable anaerobic ancient angelfish angling animate ankle annuity anteater antibody antiquity antler anymore anywhere appease applaud apply approval aptly area armadillo arming army array arson ashamed asleep astonish astute atrium attendant attire audacious audition autistic available average avoid awkward babbling backdrop backing backlog backside backtalk backyard badland bagful baggy baking bamboo bankbook banner barbell baritone barrack barstool basil bath battery bladder blandness blatantly blemish blinked blitz bloomers bluff blurry boasting bobsled bogus bonded bonelike bony booth boozy boss bottle bounding boxing breeching brewery bridged brink broadband broadways bronco browbeat brunette bubble buckle buddhist buffer bulginess bullfrog bullseye bunion busboy buzz caboose caddy cake caliber camcorder camping candied cannabis canon capably capped captive carbon cardstock cargo carnation carpool cartel carve casing catacomb catatonic caterer catlike cattle causation cavalier celestial ceramics cesarean chalice change chapped charger charter chastity cheddar chemicals chest chewy childless chirping chlorine choosing chrome chunk cinema circus citrus clambake clanking clarity clavicle cleaver clever clinic clock clothing clump clutter coastland cobweb coexist coherence cold collected colonist come commence commodore compacter compel composite computer concept conclude condone confetti confined confront congrats connected consonant consult contend contort convent coping cornball cornfield coronary corridor cortex cost countable courier cozily crabmeat craftwork cranium crawlers craziness creasing credible crepe crevice cried crinkle crispy croon crowd cruelness crumpled crushed cryptic cucumber culpable cupcake curdle curliness cursor curvy custody cycle cytoplasm daily dance danger darkened darn datebook daybed dayroom deafness debatable debtor decathlon december decidable decline decrease deed defacing defendant defiance deflate deforest degraded dejected delicacy deliverer deluxe democrat denial dentist departure deport deprive derby designed desolate destruct detention detract deviation devotion diabetes dial dicing diffuser diligent dimmed dinghy diocese directed dirtiness disaster discharge discuss disinfect dislodge disobey dispense displease disrupt distinct ditch dividers divisibly doable dodgy dollop dominion donut doormat doozy dotted doze drainable dramatize dreadful dreamlike dress driller drivable drizzly dropkick drowsily duchess duct duller duo durably dutiful dweller dynasty eardrum earmuff earthen earwig easing eaten ebook ecologist ecosystem editor effects eggplant eject elderly elevate eligible elk eloquence email ember emboss emit emperor employed emptiness enchanted encore endanger endnote endurable enforced engraved enigmatic enlarged enrich entangled entity entrust enviably epic epileptic equation eradicate errand escalator esophagus essential estranged ether evade even evict evolve exceeding exclaim excretory exemplify exhale exodus expansion expend explain exploring express extenuate extras fabric facelift facsimile faculty false famished fang fastball favorably federal feline femur ferocious fester fever fidgeting figment filling finalist fineness finite flaccid flail flanking flashcard flatfoot flattery flavoring flier flirt florist flying foil fondly footage foothill footpad footwear fountain fragility framing freckled freefall freeness freezing frequent fridge frigidly frivolous frostily frozen frying gains gallon game gangway garland gas gauze geek genetics geography geranium germproof getup giddy giggling girdle gizzard glamorous glaring glider glitter glorified glove glutinous goes golf good goon gosling grab grader grafted grandma grant grasp gratuity gravity greedless greyhound grill grinch groggy grope growing gruffly grunt guileless gumball gurgling guts habitant hacksaw halt hamper handbrake handed handiwork handoff handsfree handwrite hankering happiest hardcore hardhat hardware harmonica harsh hastiness hatching haven hazy headed headless headscarf headwear heaving helmet hemlock herbal heroism hesitate huff humble humming humpback hungrily huntsman hurricane husked hydration hypnoses hypocrisy icky ideally idiocy iguana imagines immerse immortal impale imperfect implicit important impotent improper impulsive ipad irregular islamic issue itunes jackknife jalapeno jasmine jawline jeeringly jiffy jitters jogging jolly joyous judgingly jugular july june jurist justly karate keg kettle kilowatt kindness kinsman kite knee kosher laboring ladybug lake landlady landmine lankiness lapping lasso latrine laurel lazy legged legroom length lethargic levers librarian lifter likewise limeade line linoleum liqueur litmus liver lubricate ludicrous luminous lunchbox lure lustfully luxury macarena magazine magnesium magnitude majorette malformed manager mandolin manhole manila manned manual marbles margin marlin marshland masculine mastiff matchless matriarch maturely maximum mobile mockup moisten molecular monday mongoose monologue monsieur moodiness moonlike moonwalk morbidly mortician most motive mounted moustache moving mug multiple mumbo mundane murmuring mushy mustard mutation mutual myth nanny nappy nativity navigator neatly negation nemeses nervy neurotic nickname nineteen nuclei numbly numerous nutlike nuzzle obedience oblivion obscurity obsessive obtrusive occupier october okay ominous ongoing onset onyx open operator opposite other outback outcast outfield outing outmatch output outsell outsource outwit overarch overbook overcrowd overeager overflow overhead overlabor overlord overplay override oversight overstay overthrow overuse oxidant oyster pacifism paddling palace pampered pancreas panning pants papyrus parakeet parameter parched parkway parsnip partner passcode passivism pastel patchwork patient patronize paving payee pebble pediatric pellet pendant penny perceive perfectly perkiness persecute pessimism petition petty phoney phrase planner platform plausible playgroup playoff plaza plethora plow plural poem pointless polar polka poncho popper porcupine portfolio posh postal postnasal pound power pranker preaching precook prefix preheated premium preplan preshow preteen pretzel prewar primary prior private probation process produce profile progress promoter pronounce properly prorate protract provided provoking proxy pry pug pulverize punctuate puppet pureness purist purr pushcart pushpin puzzling quail qualify quartered quicken quill quiver race radial radio raging railway rambling ranged ranting rasping ravishing reactor reappoint reassure rebirth rebuilt recast recital recluse reconcile recoup rectify reenter refill reflected reforest refrain refurbish refute region regroup rehire rejoicing related release relic reload remark reminder remold remover renegade renovate reoccupy repaint repeated replica repressed reproduce repulsion require rescuer resend residence resilient resonant result retainer retinal retorted retreat retying reveal reverence revert revival revolver reword ribcage ricotta rift rind ripeness rise rival riveting robin rockfish rocky roster rounding routing rubbing rug rumor runt rust sacrifice sadness saffron saint saline salute sampling sandbank sanding sandworm sapling sash satirical saucy savior scalded scalping scapegoat scarily schedule scholar scone scorecard scorpion scouts scrap scribing scrubbed scuff secluding sector sedation seismic selector semifinal send sensually sequel serpent sessions sevenfold shack shady shaky shamrock sharpener sheath shelter shifting shine shirt shopping shorten shorts showcase shown shrank shrill shrubbery shuffle siamese sift silicon silver simply singular siren situation sixtyfold sizzling skeptic skier skimmed skinless skirmish skype slacking slang slather sleeve slick slightly slip sloping sludge small smell smith smokiness smudge snack snazzy sniff snore snowboard snowfield snowshoe snuggle spearman specks speed spending spider spinal spiny splashed splendor spoilage spokesman spooky sporty spotty sprawl sprinkler spry squad squatting squeeze squire stable stagnant stalemate stamp starch stark starry startup statistic staunch steam stegosaur stereo sternum stifle stimuli stingy stitch stonewall stooge stopped storeroom stowing strangely straw strenuous strict striving strongman strung stucco stuffed stung sturdily stylus subduing sublet submitter subscript subsoil subtly subwoofer sudoku suffocate suitably sulfur superbowl supermom support surface surging surrender surviving sustained swan sweep swiftness swinger swizzle swung synapse synthetic tableful tacking tactical tag tall tank tapered tarantula tartly tasting taunt theatrics thermal thicken thimble thinning thong threaten throat thrower thus tidbit tightly tiling tinderbox tinkling tipoff tiring tractor trailing transfer trapdoor traps treachery tree trend tribunal trickily tricycle trilogy trio trolling troubling truck trustful tubeless tulip turbofan turret tweak twenty twilight twister tying umbilical unadvised unashamed unbeaten unblessed unbridle uncanny uncharted unclasp uncoated uncork uncross uncut undefined underdog undergrad underpaid undertook undesired undrafted unearth unedited unethical unfasten unfitting unfounded unglazed unguarded unheard unhitched unifier uninstall unison unkempt unlatch unleveled unlisted unlocking unlucky unmasked unmolded unnamed unopened unpaired unplanned unpopular unreached unrented unrivaled unrushed unsavory unsecured unsent unsheathe unsmooth unsorted unsteady unstuffed unsworn untapped until untouched untrue unused unveiling unwarlike unwelcome unwitting unwound upchuck upheaval upload uproar upstart uptight urban urologist uselessly utilize vacate vagueness value vaporizer varmint vastly velcro veneering venus verse very viability video vigorous violate viral viscous visitor vitamins vocalize volatile voucher wafer wagon walrus wasabi washday washroom water wham whinny whoopee widen wife wildfire willed wimp winner wiring wispy wok womanlike woozy worry wow wrecking wrist wrongly yam yearbook yelp yippee yoyo zeppelin zipping zone".split(" ");
}

function generatePassphrase(count, separator, addDigit, randInt) {
  const rand = randInt || defaultRandInt;
  const words = passphraseWords();
  if (!words.length) return { error: "The passphrase word list did not load. Please try again." };
  count = Math.max(3, Math.min(8, parseInt(count, 10) || 6));
  const picked = [];
  for (let i = 0; i < count; i++) picked.push(words[rand(words.length)]);
  const sep = separator === "none" ? "" : (separator || "-");
  let pw = picked.join(sep);
  if (addDigit) pw += sep + String(rand(90) + 10);
  return { password: pw };
}

function passphraseEntropy(count, wordCount) {
  return Math.round(count * Math.log2(wordCount || 1296) * 10) / 10;
}
/* Easy to say and type: consonant-vowel syllables, like "bemikot". */

function generatePronounceable(length, randInt) {
  const rand = randInt || defaultRandInt;
  const cons = "bcdfghjklmnpqrstvwxz", vows = "aeiou";
  let out = "";
  while (out.length < length) out += cons[rand(cons.length)] + vows[rand(vows.length)];
  return out.slice(0, length);
}
/* A PIN is digits only, and never starts with 0. */

function generatePin(digits, randInt) {
  const rand = randInt || defaultRandInt;
  let out = String(1 + rand(9));
  for (let i = 1; i < (digits || 6); i++) out += String(rand(10));
  return out;
}
/* Strength meter with crack-time from zxcvbn (MIT), loaded only when a
   password is made. Returns null when the library has not loaded, so the
   caller falls back to the plain note. */

function passwordZxcvbnNote(pw) {
  if (!window.zxcvbn) return null;
  try {
    const r = window.zxcvbn(pw);
    const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
    const time = r.crack_times_display && r.crack_times_display.offline_slow_hashing_1e4_per_second ? r.crack_times_display.offline_slow_hashing_1e4_per_second : "unknown time";
    return { score: r.score, label: labels[r.score] || "Unknown", crackTime: "An attacker guessing 10,000 passwords a second would need " + time };
  } catch (e) { return null; }
}

/* Show only the controls for the chosen password mode. */

function pwdModeRows() {
  const m = ($("pwdMode") || {}).value || "random";
  const show = (id, on) => { const el = $(id); if (el) el.style.display = on ? "" : "none"; };
  show("pwdLengthRow", m === "random" || m === "pronounceable");
  show("pwdCharsetsRow", m === "random");
  show("pwdPassphraseRow", m === "passphrase");
  show("pwdPinRow", m === "pin");
}

const pwdMode = $("pwdMode");
if (pwdMode) pwdMode.addEventListener("change", pwdModeRows);
pwdModeRows();

const pwdLength = $("pwdLength");
if (pwdLength) pwdLength.addEventListener("input", () => { const l = $("pwdLengthLabel"); if (l) l.textContent = pwdLength.value; });

const pwdBtn = $("pwdBtn");
if (pwdBtn) pwdBtn.addEventListener("click", async () => {
  const mode = ($("pwdMode") || {}).value || "random";
  let password = null, note = "";
  if (mode === "passphrase") {
    const count = parseInt(($("pwdWordCount") || {}).value || "6", 10) || 6;
    const sep = ($("pwdSeparator") || {}).value || "-";
    const addDigit = !!($("pwdAddDigit") || {}).checked;
    const made = generatePassphrase(count, sep, addDigit);
    if (made.error) { setStatus("pwdStatus", made.error); return; }
    password = made.password;
    note = "Passphrase of " + count + " words from a 1,296-word list: about " + passphraseEntropy(count, passphraseWords().length) + " bits of entropy.";
  } else if (mode === "pronounceable") {
    const length = parseInt(($("pwdLength") || {}).value, 10) || 16;
    password = generatePronounceable(length);
    note = "Pronounceable password: easier to say and type, but weaker than a random one of the same length.";
  } else if (mode === "pin") {
    const digits = parseInt(($("pwdPinDigits") || {}).value || "6", 10) || 6;
    password = generatePin(digits);
    note = "A PIN is only for places that ask for digits, like a phone lock. Never reuse it as a website password.";
  } else {
    const length = parseInt(($("pwdLength") || {}).value, 10) || 16;
    const excludeAmbiguous = !!($("pwdExcludeAmbiguous") || {}).checked;
    const opts = { upper: !!($("pwdUpper") || {}).checked, lower: !!($("pwdLower") || {}).checked, numbers: !!($("pwdNumbers") || {}).checked, symbols: !!($("pwdSymbols") || {}).checked, excludeAmbiguous: excludeAmbiguous };
    const setCount = ["upper", "lower", "numbers", "symbols"].filter((k) => opts[k]).length;
    const result = generatePassword(length, opts);
    if (result.error) { setStatus("pwdStatus", result.error); return; }
    password = result.password;
    note = passwordStrengthNote(length, setCount);
  }
  if ($("pwdOutput")) $("pwdOutput").textContent = password;
  /* Strength meter: zxcvbn loads only when a password is made, so the
     page stays light. When it cannot load, the plain note stands. */
  if (!window.zxcvbn) await loadLibrary("zxcvbn", null);
  const zx = passwordZxcvbnNote(password);
  const meter = $("pwdStrength");
  if (meter) meter.textContent = zx ? "Strength: " + zx.label + " (score " + zx.score + " of 4). " + zx.crackTime + "." : note;
  setStatus("pwdStatus", "Done. " + note + (zx ? " Strength meter: " + zx.label + " (score " + zx.score + " of 4). " + zx.crackTime + "." : ""));
});

const pwdCopyBtn = $("pwdCopyBtn");
if (pwdCopyBtn) pwdCopyBtn.addEventListener("click", () => {
  const text = $("pwdOutput") ? $("pwdOutput").textContent : "";
  if (!text || text.startsWith("Your password")) { setStatus("pwdStatus", "Generate a password first, then use Copy."); return; }
  copyTextToClipboard(text, "pwdStatus");
});
