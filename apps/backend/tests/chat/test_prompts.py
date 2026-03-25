from app.core.prompt_loader import load_prompt_template, render_prompt_template


CHAT_PROMPTS_PACKAGE = "app.chat.prompts"


def test_prompt_templates_load_and_render():
    catalog_prompt = render_prompt_template(
        "catalog_prompt.py",
        package=CHAT_PROMPTS_PACKAGE,
    )

    assert load_prompt_template("base_instructions.py", package=CHAT_PROMPTS_PACKAGE)
    assert load_prompt_template("branch_instructions.py", package=CHAT_PROMPTS_PACKAGE)
    assert load_prompt_template("catalog_prompt.py", package=CHAT_PROMPTS_PACKAGE)
    assert "## Generative UI" in catalog_prompt
    assert '"root": "<element-id>"' in catalog_prompt

    base_instructions = render_prompt_template(
        "base_instructions.py",
        package=CHAT_PROMPTS_PACKAGE,
        catalog_prompt=catalog_prompt,
    )

    assert (
        base_instructions
        == "You are continuing an existing chat conversation. "
        "Respond naturally and keep the answer grounded in the transcript.\n\n"
        f"{catalog_prompt}"
    )
