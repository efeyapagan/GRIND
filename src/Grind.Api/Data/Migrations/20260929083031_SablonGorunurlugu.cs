using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SablonGorunurlugu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // #540: once yeni sutun, sonra VERI, en son eski sutun -- uretilen surum eski sutunu
            // once siliyordu ve secimler kayboluyordu (#199'daki YorumCevirileri ile ayni duzeltme).
            migrationBuilder.AddColumn<string>(
                name: "Visibility",
                table: "WorkoutTemplates",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            // Eski `true` "paylasimda" demekti ve paylasim o gun YALNIZ arkadaslaraydi: Friends'e
            // doner, Public'e DEGIL -- yoksa mevcut sablonlar sessizce herkese acilirdi. `false` ->
            // Hidden. `null` (secilmemis) null kalir ve hesap seviyesinden turemeye devam eder.
            migrationBuilder.Sql(
                """
                UPDATE "WorkoutTemplates"
                SET "Visibility" = CASE WHEN "IsSharedOverride" THEN 'Friends' ELSE 'Hidden' END
                WHERE "IsSharedOverride" IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "IsSharedOverride",
                table: "WorkoutTemplates");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSharedOverride",
                table: "WorkoutTemplates",
                type: "boolean",
                nullable: true);

            // Geri donuste Public da `true` olur: eski modelde "arkadas olmayana acik" diye bir
            // kademe yoktu, en yakin karsiligi "paylasimda".
            migrationBuilder.Sql(
                """
                UPDATE "WorkoutTemplates"
                SET "IsSharedOverride" = ("Visibility" <> 'Hidden')
                WHERE "Visibility" IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "WorkoutTemplates");
        }
    }
}
