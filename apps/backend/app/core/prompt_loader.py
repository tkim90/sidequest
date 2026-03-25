from functools import cache
import importlib
from pathlib import Path


PROMPT_TEMPLATE_ATTR = "PROMPT_TEMPLATE"


def _to_module_name(name: str) -> str:
    return Path(name).stem


@cache
def load_prompt_template(name: str, *, package: str) -> str:
    module_name = _to_module_name(name)
    module = importlib.import_module(f"{package}.{module_name}")
    template = getattr(module, PROMPT_TEMPLATE_ATTR)
    return str(template).strip()


def render_prompt_template(name: str, *, package: str, **values: str) -> str:
    return load_prompt_template(name, package=package).format(**values)
