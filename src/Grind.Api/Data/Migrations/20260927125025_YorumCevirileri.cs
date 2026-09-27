using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class YorumCevirileri : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiInsightTranslations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AiInsightId = table.Column<long>(type: "bigint", nullable: false),
                    Language = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiInsightTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiInsightTranslations_AiInsights_AiInsightId",
                        column: x => x.AiInsightId,
                        principalTable: "AiInsights",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiInsightTranslations_AiInsightId_Language",
                table: "AiInsightTranslations",
                columns: new[] { "AiInsightId", "Language" },
                unique: true);

            // Mevcut yorumlar tek dilliydi (Turkce) -- kolonu dusurmeden ONCE tasinir, yoksa
            // uretilmis (ve parasi odenmis) her yorum kaybolur.
            migrationBuilder.Sql(
                """
                INSERT INTO "AiInsightTranslations" ("AiInsightId", "Language", "Content")
                SELECT "Id", 'tr', "Content" FROM "AiInsights";
                """);

            migrationBuilder.DropColumn(
                name: "Content",
                table: "AiInsights");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Content",
                table: "AiInsights",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Geri alirken metin kaybolmasin: her yorum icin tek bir ceviri geri yazilir
            // (birden fazla dil varsa Turkce, yoksa eldeki ilk dil).
            migrationBuilder.Sql(
                """
                UPDATE "AiInsights" a
                SET "Content" = COALESCE((
                    SELECT t."Content" FROM "AiInsightTranslations" t
                    WHERE t."AiInsightId" = a."Id"
                    ORDER BY (t."Language" <> 'tr'), t."Id"
                    LIMIT 1), '');
                """);

            migrationBuilder.DropTable(
                name: "AiInsightTranslations");
        }
    }
}
