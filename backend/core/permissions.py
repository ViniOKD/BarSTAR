from rest_framework.permissions import DjangoModelPermissions


class PermissoesPromocao(DjangoModelPermissions):
    # copia as permissões padrão.
    perms_map = DjangoModelPermissions.perms_map.copy()

    # exige permissão de visualização nos métodos de consulta.
    perms_map.update({
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "HEAD": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": ["%(app_label)s.view_%(model_name)s"],
    })
