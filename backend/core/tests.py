from django.db.migrations.loader import MigrationLoader
from django.test import SimpleTestCase


class MigrationTests(SimpleTestCase):
    def test_migrations_have_no_conflicting_branches(self):
        self.assertEqual(MigrationLoader(None).detect_conflicts(), {})
