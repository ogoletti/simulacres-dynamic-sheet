/* Rolls and spells */

const talent_list_selector = ".talent input[id*='-name']"

/* Spell-related */

function add_row_listeners(row = $(document)) {
    add_save_to_dom_listeners(row)
    row.find(".spell-list").on("change", list_changed)
    row.find(".spell-formula-elem").on("click", event => {
        update_spell_value(row_elem(event.target, "value"))
    })
    row.find(".spell-difficulty-input").on("change", event => {
        update_spell_value(row_elem(event.target, "value"))
    })
}

function compute_formula(row) {
    const elements = ["component", "means", "realm"]
    let sum = 0
    for (let i = 0; i < elements.length; i++) {
        const elem_name = row[0].id + "-" + elements[i]
        const checked_elem = $("input[name=" + elem_name + "]:checked")
        if (checked_elem.length === 0)
            return null  // Not a full formula
        const base_array = checked_elem[0].id.split("-")
        sum += parseInt($("#" + base_array[base_array.length - 1]).val())
    }
    return sum
}

function update_spell_value(value_div) {
    let sum = 0

    // Recover component, means and realm
    const formula = compute_formula(row(value_div[0]))
    if (formula === null)
        return
    sum += formula

    // Recover difficulty
    sum += parseInt(row_elem(value_div[0], "difficulty").text())

    // Update
    value_div.text(sum)
}

function list_changed(event) {
    // Fix the level to 0 if divine or ki energies
    const slider = row_elem(event.target, "difficulty-input")
    if (slider.length === 0 || slider[0].id.includes("spell-x-"))
        return

    if (event.target.value === "Divin") {
        slider.val(10).slider("setValue", 10).slider("refresh", {useCurrentValue: true}).slider("disable")
        $(slider.slider("getElement")).hide()
    } else if (event.target.value.length === 0) {
        slider.slider("enable").slider("refresh", {useCurrentValue: true})
        $(slider.slider("getElement")).show()
    }

    // Update spell value
    update_spell_value(row_elem(slider[0], "value"))

    // Update adventure points
    compute_remaining_ap()
}

add_row_listeners()

/* Rolls-related */

function update_talent_select(select) {
    // Find the selected option
    const selected_option = select.find("option:selected").val()

    // Recover talent list
    const talent_list = $(talent_list_selector).filter((i, e) => {
        return e.value && e.value.length > 0;
    })
    select.empty()

    // Sort it
    talent_list.sort((a, b) => {
        return a.value.localeCompare(b.value) // Sort correctly accents
    }).each((i, elem) => {
        let new_option = "<option value='" + elem.value + "'"
        if (selected_option === elem.value) // Keep selection
            new_option += " selected"
        new_option += ">" + elem.value + "</option>"
        select.append(new_option)
    })

    if (select.id !== "roll-x-talent")
        select.selectpicker("refresh")
}

function update_roll_value(value_div) {
    let sum = 0

    // Recover component, means and realm
    const formula = compute_formula(row(value_div[0]))
    if (formula === null)
        return
    sum += formula

    // Add talent if any
    let talent = row_elem(value_div[0], "talent")
    if (talent.length === 0)
        return
    talent = talent.val()

    const talent_div = $(".talent input[value='" + talent + "']")
    if (talent_div.length === 0)
        sum = "X"
    else {
        const level = talent_level(talent_div[0])
        if (level === "x")
            sum = "X"
        else
            sum += parseInt(level)
    }

    // Update
    value_div.text(sum)
}

function roll_changed(event) {
    // Trigger update of the spell difficulty
    update_roll_value(row_elem(event.target, "value"))
}

function talent_changed(e, clickedIndex, newValue, oldValue) {
    roll_changed(e)
    const talent = row_elem(e.target, "talent")
    talent.children().each((i, elem) => { // Save results in DOM
        elem.removeAttribute('selected')
        if (i === clickedIndex) {
            talent.children()[clickedIndex].setAttribute('selected', 'selected')
        }
    })
}

/* Triggers */

$(".roll-formula-elem").on("click", roll_changed)

$(".realm,.component,.realm," + talent_list_selector).on("change", _ => {
    // Update all of the spell values
    $(".spell-value").each((i, elem) => {
        update_spell_value($(elem))
    })
    // Update all the rolls
    $(".roll-value").each((i, elem) => {
        update_roll_value($(elem))
    })
})

/* Add buttons */

$("#add-spell").on("click", (event, idx=null) => { // Add parameter for forced index
    const table = $("#spell-table")

    // We have to reset listeners because of the slider
    const new_spell = $("#spell-x").clone(true, false)

    // Find all elements that have id containing old value
    new_spell.find("input").each((i, elem) => {
        elem.value = ""
        $(elem).trigger("change")
    })

    const new_id = add_row(table, new_spell, idx)
    activate_slider(new_spell.find("#spell-" + new_id + "-difficulty-input")[0],
        input => {
            return value => {
                const max = slider_max(input)
                const difficulty_elem = $("#" + input.id.slice(0, -6))
                let difficulty // Use the count of the spell casted to compute difficulty
                if (value < 4)
                    difficulty = -4
                else if (value <= 6)
                    difficulty = -3
                else if (value <= 8)
                    difficulty = -2
                else if (value === 9)
                    difficulty = -1
                else if (value <= 19)
                    difficulty = 0
                else if (value <= 29)
                    difficulty = 1
                else
                    difficulty = 2
                difficulty_elem.text(difficulty)
                return value + "/" + max
            }
        })

    add_row_listeners(new_spell)
})

$("#add-roll").on("click", (event, idx=null) => { // Add parameter for forced index
    const new_row = $("#roll-x").clone(true, false)

    const new_id = add_row($("#roll-table"), new_row, idx)
    const select = new_row.find("#roll-" + new_id + "-talent")
    select.selectpicker()

    // Reset all the listeners
    add_save_to_dom_listeners(new_row)
    new_row.find("input").each((i, elem) => {
        elem.value = ""
        $(elem).trigger("change")
    })
    select.on("changed.bs.select", talent_changed)
    new_row.find(".roll-formula-elem").on("click", roll_changed)
})